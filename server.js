import http from "node:http"
import { Server } from 'socket.io'
import express from "express"
import path from "path"
import { publisher, redis, subscriber } from "./redis-connection.js"

const startServer = async () => {
    const app = express()
    app.use(express.static(path.resolve('./public')))

    const server = http.createServer(app)
    const io = new Server()

    io.attach(server)

    const PORT = process.env.PORT || 3000
    server.listen(PORT, () => {
        console.log(`Server is listening on port http://localhost:${PORT}`)
    })

    await subscriber.subscribe('Internal-Server:checkbox-updates')
    subscriber.on('message', (channel, message) => {
        const { id, checked, name, socketId } = JSON.parse(message)

        // Store in Redis and log existing state if it exists
        redis.get(`checkbox:${id}`).then((existing) => {
            if (existing) {
                const existingData = JSON.parse(existing)
                if (existingData.socketId !== socketId) {
                    console.log(`Updating state for checkbox ${id} from another client.`)
                }
            } else {
                console.log(`Setting initial state for checkbox ${id}.`)
            }
        }).catch((error) => {
            console.error(`Error fetching state for checkbox ${id}:`, error)
        })
        redis.set(`checkbox:${id}`, JSON.stringify({ id, checked, name, socketId })) 
        io.emit('update-checkbox-state', { id, checked, name, socketId }) // Broadcast to all clients including the sender
    })
    io.on('connection', async (socket) => {
        console.log('A user connected', socket.id)

        // Send all current states to the newly connected user
        const keys = await redis.keys('checkbox:*')

        const values = await Promise.all(
            Object.values(keys).map(async (key) => {
                return await redis.get(key).then((value) => JSON.parse(value))
            })
        )

        socket.emit('initial-states', values)

        socket.on('checkbox-clicked', ({ id, checked, name}) => {
            console.log('Received checkbox state change:', { id, checked, name, socketId: socket.id })

            publisher.publish(
                'Internal-Server:checkbox-updates',
                JSON.stringify({ id, checked, name, socketId: socket.id }))

        })
    })

}

startServer().catch((error) => {
    console.error("Error starting server:", error)
})
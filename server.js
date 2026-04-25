import http from "node:http"
import { Server } from 'socket.io'
import express from "express"
import path from "path"

const startServer = async () => {
    const app = express()
    app.use(express.static(path.resolve('./public')))

    const server = http.createServer(app)
    const io = new Server()

    io.attach(server)

    server.listen(3000, () => {
        console.log("Server is listening on port 3000")
    })

    const checkBoxStates = {}
    io.on('connection', (socket) => {
        console.log('A user connected', socket.id)

        // Send all current states to the newly connected user
        socket.emit('initial-states', Object.values(checkBoxStates))

        socket.on('checkbox-clicked', ({ id, checked, name}) => {
            console.log('Received checkbox state change:', { id, checked, name })
            // Broadcast the new state to all other clients
            checkBoxStates[id] = { id: id, checked: checked, name: name, socketId: socket.id }
            socket.broadcast.emit('update-checkbox-state', { id, checked, name })

        })

    })
}

startServer().catch((error) => {
    console.error("Error starting server:", error)
})
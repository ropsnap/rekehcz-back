const axios = require('axios'),
         Checker = require('./Checker/index.js'),
            Session = require('./Session/index.js'),
                e = process.env;

function main (wss) {

    // ------------------------------------------
    // handles new websocket incoming connections
    // ------------------------------------------

    wss.on('connection', (ws, req) => {

        // enforces single connection by keeping the first only
        // ... and blocking any other
        if (wss.clients.size !== 1) {
            ws.send('close')
            ws.close(); 
            return;
        }

        // if global.session is set
        if (!global.session) {
             global.session = new Session(req)
        }

        ws.send(JSON.stringify({
            name: 'session-update',
            data: global.session
        }))

        // send immediatly a feedback to the incoming connection    
        console.log('New incoming connection on Websocket')
        console.info('global.session', global.session)

        // -------------------------------------------------
        // connection is up, let's add a simple simple event
        // -------------------------------------------------

        ws.on('message', async (event) => {

            // an event handler from front-end
            let ev = JSON.parse(event.toString())

            // an event handler from front-end
            if (ev.name === 'check-infos') {

                if (state.isChecking) {    
                    
                    ws.send(JSON.stringify({
                        name: 'check-error',
                        data: { 
                            error: 'A check process is still running', 
                            message: 'Fail at check-infos event'
                        }
                    }))

                    return;
                }
                    
                // ----------------------------------
                // ----------- main algorithm - start
                // ----------------------------------

                console.log('Initializing checker')

                state.isChecking = true;
                
                // construct checker instance 
                // ev.data = array of infocc text
                let checker = global.checker = new Checker(ev.data)
                
                // handles check error (not charge error)
                checker.on('error', (error, errmsg, infoMissed) => {
                    ws.send(JSON.stringify({ 
                        name: 'error', 
                        data: { error, message: errmsg, infoMissed }
                    }))
                })

                // handles each info checked
                checker.on('check', infoParsed => {

                    console.info('+ info checked')                    

                    ws.send(JSON.stringify({ 
                        name: 'check', 
                        data: infoParsed
                    }))
                })

                checker.on('check-status-update', (status, progress) => {
                    ws.send(JSON.stringify({
                        name: 'check-status-update',
                        data: { status, progress }
                    }))
                })

                // when checker checks all infos
                checker.on('stop', stopmsg => {
                    state.isChecking = false;
                    console.info('Stopping checker → ', stopmsg)   
                    ws.send(JSON.stringify({ 
                        name: 'stop', 
                        data: { message: stopmsg }
                    }))
                })

                // starts checker
                checker.start()

                // --------------------------------
                // ----------- main algorithm - end
                // --------------------------------
            }

            // assures connection stability btw front/back
            if (ev.name === 'keep') {
                // when checker checks all infos
                console.infoff('keep event dispatched from client')
            }

            // when user clicks front-end button to stop checks
            if (ev.name === 'stop-checks') {
                if (global.checker) {
                    await global.checker.emit('stop', 'Cancelamento de processo solicitado')
                }
            }

        })
        
        // -------------------------------------------------
        // connection is close, usually by user exit page/tab
        // -------------------------------------------------

        // ws.on('close', async (event) => {
        //     if (global.checker) {
        //         await global.checker.emit('stop', 'Cancelamento de processo por conexão encerrada')
        //     }
        // })
        
    });
}

module.exports = main;
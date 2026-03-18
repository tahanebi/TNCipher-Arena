const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

const players = {};

io.on('connection', (socket) => {
    console.log('Operatör sisteme bağlandı: ' + socket.id);

    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 40) - 20,
        y: 2,
        z: Math.floor(Math.random() * 40) - 20,
        playerId: socket.id,
        health: 100,
        isDead: false,
        kills: 0,
        deaths: 0
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id] && !players[socket.id].isDead) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('shoot', (weaponData) => {
        if(players[socket.id] && !players[socket.id].isDead) {
            socket.broadcast.emit('enemyShoot', { id: socket.id, weapon: weaponData });
        }
    });

    socket.on('hitEnemy', (data) => {
        const target = players[data.targetId];
        const shooter = players[socket.id];

        if (target && !target.isDead && shooter && !shooter.isDead) {
            target.health -= data.damage;
            
            if (target.health <= 0) {
                target.health = 0;
                target.isDead = true;
                target.deaths++;
                shooter.kills++;

                io.emit('playerDied', { victim: data.targetId, killer: socket.id });
                // Skor tablosunu herkese güncelle
                io.emit('updateScoreboard', players);

                setTimeout(() => {
                    if(players[data.targetId]) {
                        players[data.targetId].health = 100;
                        players[data.targetId].isDead = false;
                        players[data.targetId].x = Math.floor(Math.random() * 40) - 20;
                        players[data.targetId].z = Math.floor(Math.random() * 40) - 20;
                        io.emit('playerRespawn', players[data.targetId]);
                    }
                }, 4000);
            }
            io.emit('healthUpdate', { id: data.targetId, health: target.health });
        }
    });

    // Biri TAB'a basınca skorları gönder
    socket.on('requestScoreboard', () => {
        socket.emit('updateScoreboard', players);
    });

    socket.on('disconnect', () => {
        console.log('Bağlantı koptu: ' + socket.id);
        delete players[socket.id];
        io.emit('disconnectPlayer', socket.id);
        io.emit('updateScoreboard', players);
    });
});

http.listen(3000, () => {
    console.log('TN Cipher Sunucusu Aktif - Port 3000');
});
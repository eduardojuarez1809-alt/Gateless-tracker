const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar SQLite
const db = new sqlite3.Database('./gateless.db', (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Base de datos SQLite conectada correctamente.');
    }
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT,
    status TEXT,
    start_time TEXT,
    end_time TEXT,
    duration_seconds INTEGER,
    duration_minutes REAL,
    overtime TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Endpoint: Registrar nuevo log desde el cliente de agente
app.post('/api/logs', (req, res) => {
    const { agent, status, start_time, end_time, duration_seconds, duration_minutes, overtime } = req.body;

    const query = `INSERT INTO logs (agent, status, start_time, end_time, duration_seconds, duration_minutes, overtime)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [agent, status, start_time, end_time, duration_seconds, duration_minutes, overtime || 'No'], function(err) {
        if (err) {
            console.error("Error al insertar log:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// Endpoint: Obtener todos los logs para el dashboard de administración
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM logs ORDER BY id DESC", [], (err, rows) => {
        if (err) {
            console.error("Error al consultar logs:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Endpoint: Limpiar / Reiniciar registros
app.delete('/api/logs', (req, res) => {
    db.run("DELETE FROM logs", [], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: "Registros borrados correctamente." });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor de Tracker corriendo en el puerto ${PORT}`);
});

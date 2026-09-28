const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Asegurar carpeta para datos si se usa disco persistente en Render
const dataDir = process.env.DATA_DIR || './';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tracker_database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS agent_logs (
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
});

// API: Guardar la marca del agente
app.post('/api/status', (req, res) => {
  const { agent, status, startTime, endTime, durationSeconds, durationMinutes, overtime } = req.body;
  const stmt = db.prepare(`INSERT INTO agent_logs (agent, status, start_time, end_time, duration_seconds, duration_minutes, overtime) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  
  stmt.run(agent, status, startTime, endTime, durationSeconds, durationMinutes, overtime, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ result: 'success', id: this.lastID });
  });
  stmt.finalize();
});

// API: Obtener los últimos 200 registros para el Admin
app.get('/api/admin/logs', (req, res) => {
  db.all(`SELECT * FROM agent_logs ORDER BY id DESC LIMIT 200`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Descargar reporte en Excel (.xlsx)
app.get('/api/admin/download-excel', async (req, res) => {
  db.all(`SELECT * FROM agent_logs ORDER BY id DESC`, [], async (err, rows) => {
    if (err) return res.status(500).send("Error leyendo la base de datos");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registros Agentes');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Agente', key: 'agent', width: 25 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Hora Inicio', key: 'start_time', width: 15 },
      { header: 'Hora Fin', key: 'end_time', width: 15 },
      { header: 'Duración (Min)', key: 'duration_minutes', width: 15 },
      { header: 'Overtime', key: 'overtime', width: 12 },
      { header: 'Fecha', key: 'created_at', width: 20 }
    ];

    rows.forEach(row => worksheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Agentes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  });
});

// API: Borrar/Reiniciar toda la data de los registros
app.delete('/api/admin/clear-logs', (req, res) => {
  db.run(`DELETE FROM agent_logs`, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ result: 'success', message: 'Registros eliminados correctamente' });
  });
});

// Usar el puerto de la variable de entorno que asigna Render (o 3000 en local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor de Tracker corriendo en el puerto ${PORT}`);
});
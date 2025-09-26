const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000; // Porta onde o servidor irá rodar

// Sua string de conexão do NeonDB PostgreSQL
const connectionString = 'postgresql://neondb_owner:npg_arVEwK0t9mXM@ep-billowing-water-ac7trbb6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
    connectionString: connectionString,
    connectionTimeoutMillis: 10000, // Timeout de 10 segundos para a conexão
    ssl: {
        rejectUnauthorized: false, // Desativa a verificação de certificados SSL, necessário para alguns bancos em ambientes como o NeonDB
    },
});

// Middleware para permitir requisições de diferentes origens (CORS)
// Em um ambiente de produção, você deve restringir 'origin' ao domínio do seu jogo.
app.use(cors({
    origin: '*'  // **Revisar para produção**
}));

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Função para testar a conexão com o banco de dados
const testDBConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Conectado ao PostgreSQL:', result.rows[0].now);
        client.release(); // Libera a conexão
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
    }
};

// Testa a conexão ao iniciar o servidor
testDBConnection();

// Rota para salvar uma nova pontuação
app.post('/scores', async (req, res) => {
    const { playerName, score } = req.body; // Espera { playerName: 'Nome', score: 123 }

    // Verifica se os parâmetros necessários foram enviados
    if (!playerName || typeof score !== 'number') {
        return res.status(400).json({ error: 'Nome do jogador e pontuação são necessários' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO scores(player_name, score_value) VALUES($1, $2) RETURNING *',
            [playerName, score]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao salvar pontuação:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter as top 10 pontuações
app.get('/scores', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT player_name, score_value FROM scores ORDER BY score_value DESC LIMIT 10'
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Erro ao obter pontuações:', err.stack);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando em http://localhost:${port}`);
});

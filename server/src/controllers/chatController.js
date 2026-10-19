const { retrieveForChat } = require('./searchController');
const { chatWithOllama } = require('../services/ollama');
const { sendError } = require('../utils/errors');

const VALID_MODES = new Set(['hybrid', 'semantic', 'keyword']);

async function chat(req, res, next) {
    try {
        const { query, mode = 'hybrid' } = req.body || {};
        if (typeof query !== 'string' || !query.trim() || query.trim().length > 200) {
            return sendError(res, 'INVALID_QUERY', 'Provide a message between 1 and 200 characters', 400);
        }
        if (typeof mode !== 'string' || !VALID_MODES.has(mode)) {
            return sendError(res, 'INVALID_SEARCH_MODE', 'mode must be hybrid, semantic, or keyword', 400);
        }
        const cleanQuery = query.trim();
        const retrieval = await retrieveForChat(cleanQuery, req.organizationId, mode);
        const { answer, model } = await chatWithOllama({
            query: cleanQuery,
            sources: retrieval.results,
        });

        return res.json({
            query: cleanQuery,
            answer,
            model,
            retrievalMode: retrieval.retrievalMode,
            degraded: retrieval.degraded,
            message: retrieval.message,
            results: retrieval.results,
        });
    } catch (error) {
        if (/OLLAMA_BASE_URL/i.test(error.message)) {
            return sendError(res, 'INVALID_OLLAMA_CONFIG', error.message, 500);
        }
        if (/Could not connect to Ollama|Ollama model|Ollama took too long|Ollama returned/i.test(error.message)) {
            return sendError(res, 'OLLAMA_UNAVAILABLE', error.message, 503);
        }
        return next(error);
    }
}

module.exports = { chat };

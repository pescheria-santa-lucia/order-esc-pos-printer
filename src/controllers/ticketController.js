const { printUnified, printDivided } = require('../services/ticketService');

function buildResponse(printTicketDTO) {
    return {
        requestId: printTicketDTO.requestId,
        departmentQueueId: printTicketDTO.departmentQueueId,
        ledId: printTicketDTO.ledId,
    };
}

async function printTicket(req, res) {
    const printTicketDTO = req.body;
    const response = buildResponse(printTicketDTO);

    try {
        await printUnified(printTicketDTO);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send({ ...response, error });
    }
}

async function printTicketDivided(req, res) {
    const printTicketDTO = req.body;
    const response = buildResponse(printTicketDTO);

    try {
        await printDivided(printTicketDTO);
        return res.status(200).send(response);
    } catch (error) {
        return res.status(500).send({ ...response, error });
    }
}

function registerTicketRoutes(app) {
    app.post('/ticket/print', printTicket);
    app.post('/ticket/print-divided', printTicketDivided);
}

module.exports = { registerTicketRoutes };

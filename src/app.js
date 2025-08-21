const express = require('express');
const app = express();
const cors = require('cors')

const port = 3500;

const escpos = require('escpos');
escpos.Network = require('escpos-network');

app.use(express.json());

app.use(cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["POST"],
    credentials: true,
}));

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

app.post('/ticket/print', async (req, res) => {
    const printTicketDTO = req.body;
    const networkDevice = new escpos.Network(printTicketDTO.printerIpAddress, 9100);
    const printer = new escpos.Printer(networkDevice);

    const response = {
        requestId: printTicketDTO.requestId,
        departmentQueueId: printTicketDTO.departmentQueueId,
        ledId: printTicketDTO.ledId,
    }

    networkDevice.open(async (err) => {
        if (!!err) {
            console.error(err);

            await closeConnection(printer, networkDevice);

            return res.status(500)
                .send({
                    ...response,
                    error: {
                        message: `Impossibile connettersi alla stampante, non è connessa ad internet, manca la connessione o l'indirizzo IP è errato`,
                        errorType: "OfflineCauseStatus",
                    }
                });
        }

        console.log(`Connected to the printer with ip: ${printTicketDTO.printerIpAddress}`)

        let errors = [];

        try {
            const timer = setTimeout(() => {
                return res.status(500)
                        .send({ ...response, error: "La stampante è connessa ma è impossibile accedere allo stato della stampante" });
            }, 10000);

            printer.getStatuses(async (statuses) => {
                errors.push(...statuses.map((status) => status.toJSON().statuses.filter(s => s.status === "error").map(e => errorMapper(e))).flat())

                if (errors.length > 0) {
                    //close connection with the printer
                    await closeConnection(printer, networkDevice);

                    return res.status(500)
                        .send({ ...response, error: errors[0] });
                }

                await printer
                  .flush()
                  .font('a')
                  .align('ct')
                  .size(2, 2)
                  .text(`Ordine n.${convertText(printTicketDTO.id)}`)
                  .feed()
                  .size(0, 0)
                  .align('lt')
                  .text(`Cliente: ${convertText(printTicketDTO.customer)}`)
                  .feed()
                  .text(`Indirizzo: ${convertText(printTicketDTO.address)}`)
                  .feed()
                  .text(`Data: ${convertText(printTicketDTO.bookedSlot)}`)
                  .feed()
                  .text('------------------------------------------')
                  .feed();

                // Iterate over the categories (keys of the products object)
                Object.keys(printTicketDTO.products).forEach(category => {
                    // Print the category heading
                    printer.flush()
                      .size(1, 1)
                      .text(convertText(category))

                    // Iterate over the products within each category
                    printTicketDTO.products[category].forEach(product => {
                        printer.flush()
                          .size(1, 1)
                          .text(`- ${product.quantity}${product.unitMeasure} ${convertText(product.name)}`)
                          .size(0, 0)

                        product.addons.forEach(addon => {
                            printer.text(`  + ${convertText(addon.name)}`);
                        });
                        printer.flush()
                          .size(0, 0)
                          .feed();
                    });
                    printer.flush()
                      .size(0, 0)
                      .feed(2)
                      .text('------------------------------------------')
                });

                printer.flush()
                  .feed(2)
                  .cut(true, 3)
                  .close();

                console.log("Printed content");

                clearTimeout(timer);

                await closeConnection(printer, networkDevice);

                return res.status(200)
                    .send(response);
            });

        } catch (e) {
            console.error(e);

            return res.status(500)
                .send({
                    ...response,
                    error: {
                        message: `Impossibile stampare il biglietto`,
                        errorType: "PrinterError",
                    }
                });
        }

    });
});

app.post('/ticket/print-divided', async (req, res) => {
    const printTicketDTO = req.body;
    const categories = Object.keys(printTicketDTO.products);
    const networkDevice = new escpos.Network(printTicketDTO.printerIpAddress, 9100);
    const printer = new escpos.Printer(networkDevice);

    const response = {
        requestId: printTicketDTO.requestId,
        departmentQueueId: printTicketDTO.departmentQueueId,
        ledId: printTicketDTO.ledId,
    }

    networkDevice.open(async (err) => {
        if (!!err) {
            console.error(err);

            await closeConnection(printer, networkDevice);

            return res.status(500)
              .send({
                  ...response,
                  error: {
                      message: `Impossibile connettersi alla stampante, non è connessa ad internet, manca la connessione o l'indirizzo IP è errato`,
                      errorType: "OfflineCauseStatus",
                  }
              });
        }

        console.log(`Connected to the printer with ip: ${printTicketDTO.printerIpAddress}`)

        let errors = [];

        try {
            const timer = setTimeout(() => {
                return res.status(500)
                  .send({ ...response, error: "La stampante è connessa ma è impossibile accedere allo stato della stampante" });
            }, 10000);

            printer.getStatuses(async (statuses) => {
                errors.push(...statuses.map((status) => status.toJSON().statuses.filter(s => s.status === "error").map(e => errorMapper(e))).flat())

                if (errors.length > 0) {
                    //close connection with the printer
                    await closeConnection(printer, networkDevice);

                    return res.status(500)
                      .send({ ...response, error: errors[0] });
                }

                  await printer

                  // Iterate over the categories (keys of the products object)
                  Object.keys(printTicketDTO.products).forEach((category, index) => {
                      // Print the category heading
                      printer.flush()
                        .font('a')
                        .align('ct')
                        .size(2, 2)
                        .text(`Ordine n.${convertText(printTicketDTO.id)}`)
                        .feed()
                        .size(0, 0)
                        .align('lt')
                        .text(`Cliente: ${convertText(printTicketDTO.customer)}`)
                        .feed()
                        .text(`Indirizzo: ${convertText(printTicketDTO.address)}`)
                        .feed()
                        .text(`Data: ${convertText(printTicketDTO.bookedSlot)}`)
                        .feed()
                        .size(1, 1)
                        .text(convertText(category))
                        .feed()
                        .size(0, 0)
                        .text('------------------------------------------')

                      // Iterate over the products within each category
                      printTicketDTO.products[category].forEach(product => {
                          printer.flush()
                            .size(1, 1)
                            .text(`- ${product.quantity}${product.unitMeasure} ${convertText(product.name)}`)
                            .size(0, 0)

                          product.addons.forEach(addon => {
                              printer.text(`  + ${convertText(addon.name)}`);
                          });
                          printer.flush()
                            .size(0, 0)
                            .feed();
                      });
                      printer.flush()
                        .text('------------------------------------------')
                        .text("Segue: ")
                      categories.forEach(otherCategory => {
                          // Only print the category if it's not the current one
                          if (otherCategory !== category) {
                              printer.flush()
                                .text(`+${convertText(otherCategory)}`)
                                .feed();
                          }
                      });

                      printer.flush()
                        .size(0, 0)
                        .cut(true, 3)
                  });

                  printer.flush()
                    .feed()
                    .close();

                console.log("Printed content");

                clearTimeout(timer);

                await closeConnection(printer, networkDevice);

                return res.status(200)
                  .send(response);
            });

        } catch (e) {
            console.error(e);

            return res.status(500)
              .send({
                  ...response,
                  error: {
                      message: `Impossibile stampare il biglietto`,
                      errorType: "PrinterError",
                  }
              });
        }

    });
});

async function closeConnection(printer, networkDevice) {
    console.log(`Closed connection to the printer with ip: ${networkDevice.address}`)

    await printer.close();
    networkDevice.close();
}

function convertText(text) {
    text = text.toString();
    text = text.replaceAll('à', "a'");
    text = text.replaceAll('á', "a'");
    text = text.replaceAll('è', "e'");
    text = text.replaceAll('é', "e'");
    text = text.replaceAll('ì', "i'");
    text = text.replaceAll('í', "i'");
    text = text.replaceAll('ò', "o'");
    text = text.replaceAll('ó', "o'");
    text = text.replaceAll('ù', "u'");
    text = text.replaceAll('ú', "u'");

    text = text.replaceAll('À', "A'");
    text = text.replaceAll('Á', "A'");
    text = text.replaceAll('È', "E'");
    text = text.replaceAll('É', "E'");
    text = text.replaceAll('Ì', "I'");
    text = text.replaceAll('Í', "I'");
    text = text.replaceAll('Ò', "O'");
    text = text.replaceAll('Ó', "O'");
    text = text.replaceAll('Ù', "U'");
    text = text.replaceAll('Ú', "U'");
    text = text.replaceAll('€', " Euro");
    return text
}
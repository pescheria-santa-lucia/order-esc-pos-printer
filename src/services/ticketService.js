const escpos = require('escpos');
escpos.Network = require('escpos-network');

const { errorMapper } = require('../utils/printerErrorMapper');
const { convertText } = require('../utils/convertText');

const STATUS_TIMEOUT_MS = 10000;

function printOrderHeader(printer, dto) {
    printer.flush()
        .font('a')
        .align('ct')
        .size(2, 2)
        .text(`Ordine n.${convertText(dto.id)}`)
        .feed()
        .align('lt')
        .size(0, 0)
        .text('Cliente:')
        .size(1, 1)
        .text(convertText(dto.customer))
        .feed()
        .size(0, 0)
        .text('Indirizzo:')
        .size(1, 1)
        .text(convertText(dto.address))
        .feed()
        .size(0, 0)
        .text('Data:')
        .size(1, 1)
        .text(convertText(dto.bookedSlot))
        .feed()
        .size(0, 0)
        .text('Note:')
        .size(1, 1)
        .text(convertText(dto.note ?? ''))
        .feed();
}

function withPrinter(ipAddress, printFn) {
    return new Promise((resolve, reject) => {
        const networkDevice = new escpos.Network(ipAddress, 9100);
        const printer = new escpos.Printer(networkDevice);

        networkDevice.open(async (err) => {
            if (err) {
                console.error(err);
                await closeConnection(printer, networkDevice);
                return reject({
                    message: `Impossibile connettersi alla stampante, non è connessa ad internet, manca la connessione o l'indirizzo IP è errato`,
                    errorType: "OfflineCauseStatus",
                });
            }

            console.log(`Connected to the printer with ip: ${ipAddress}`);

            try {
                const timer = setTimeout(() => {
                    reject({
                        message: "La stampante è connessa ma è impossibile accedere allo stato della stampante",
                    });
                }, STATUS_TIMEOUT_MS);

                printer.getStatuses(async (statuses) => {
                    const errors = statuses
                        .map((status) => status.toJSON().statuses.filter(s => s.status === "error").map(e => errorMapper(e)))
                        .flat();

                    if (errors.length > 0) {
                        await closeConnection(printer, networkDevice);
                        return reject(errors[0]);
                    }

                    printFn(printer);

                    printer.flush()
                        .feed()
                        .close();

                    console.log("Printed content");
                    clearTimeout(timer);
                    await closeConnection(printer, networkDevice);

                    resolve();
                });

            } catch (e) {
                console.error(e);
                reject({
                    message: `Impossibile stampare il biglietto`,
                    errorType: "PrinterError",
                });
            }
        });
    });
}

function printProducts(printer, products) {
    products.forEach(product => {
        printer.flush()
            .size(2, 2)
            .text(`- ${product.quantity}${product.unitMeasure} ${convertText(product.name)}`)
            .size(1, 1);

        product.addons.forEach(addon => {
            printer.text(`  + ${convertText(addon.name)}`);
        });
        printer.flush()
            .size(0, 0)
            .feed();
    });
}

function printUnifiedTicket(dto) {
    return withPrinter(dto.printerIpAddress, (printer) => {
        printOrderHeader(printer, dto);

        printer.flush()
            .size(0, 0)
            .text('------------------------------------------')
            .feed();

        Object.keys(dto.products).forEach(category => {
            printer.flush()
                .size(1, 1)
                .text(convertText(category));

            printProducts(printer, dto.products[category]);

            printer.flush()
                .size(0, 0)
                .feed(2)
                .text('------------------------------------------');
        });

        printer.flush()
            .feed(2)
            .cut(true, 3);
    });
}

function printDividedTicket(dto) {
    const categories = Object.keys(dto.products);

    return withPrinter(dto.printerIpAddress, (printer) => {
        categories.forEach(category => {
            printOrderHeader(printer, dto);

            printer.flush()
                .size(1, 1)
                .text(convertText(category))
                .feed()
                .size(0, 0)
                .text('------------------------------------------');

            printProducts(printer, dto.products[category]);

            printer.flush()
                .text('------------------------------------------')
                .size(1, 1)
                .text("Segue: ");
            categories.forEach(otherCategory => {
                if (otherCategory !== category) {
                    printer.flush()
                        .text(`+${convertText(otherCategory)}`)
                        .feed();
                }
            });

            printer.flush()
                .size(0, 0)
                .cut(true, 3);
        });
    });
}

async function closeConnection(printer, networkDevice) {
    console.log(`Closed connection to the printer with ip: ${networkDevice.address}`);
    await printer.close();
    networkDevice.close();
}

module.exports = { printUnified: printUnifiedTicket, printDivided: printDividedTicket };

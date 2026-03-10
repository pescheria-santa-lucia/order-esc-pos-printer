const ERROR_MAP = {
    PrinterStatus: {
        errorType: "PrinterStatus",
        defaultMessage: "Errore generico della stampante",
        bits: {
            3: "La stampante è irraggiungibile",
        },
        noValueMessage: null,
        fallbackMessage: "In attesa di un intervento sulla stampante",
    },
    OfflineCauseStatus: {
        errorType: "OfflineCauseStatus",
        defaultMessage: "La stampante è irraggiungibile per un motivo ignoto",
        bits: {
            1: "La stampante è aperta",
            3: "La carta viene alimentata dal pulsante di alimentazione della carta",
            5: "La carta è finita, non è possibile stampare",
        },
        noValueMessage: "La stampante è irraggiungibile per un motivo ignoto",
        fallbackMessage: "Errore durante la connessione",
    },
    ErrorCauseStatus: {
        errorType: "ErrorCauseStatus",
        defaultMessage: "Errore generico della stampante",
        bits: {
            2: "La stampante è aperta",
        },
        noValueMessage: "Errore generico della stampante",
        fallbackMessage: "Errore nel taglierino automatico",
    },
    RollPaperSensorStatus: {
        errorType: "RollPaperSensorStatus",
        defaultMessage: "La stampante è incappata in un errore dovuto al rotolo di carta",
        bits: {
            "5,6": { value: "11", message: "La carta non è presente o non è posizionata correttamente" },
        },
        noValueMessage: null,
        fallbackMessage: null,
    },
};

function errorMapper(error) {
    const statusName = error.constructor.name;
    const config = ERROR_MAP[statusName] || ERROR_MAP.RollPaperSensorStatus;

    if (config.noValueMessage && !error.value) {
        return { message: config.noValueMessage, errorType: config.errorType };
    }

    const bitEntry = config.bits[error.bit];

    if (bitEntry) {
        const message = typeof bitEntry === 'object'
            ? (error.value === bitEntry.value ? bitEntry.message : config.defaultMessage)
            : bitEntry;
        return { message, errorType: config.errorType };
    }

    return {
        message: config.fallbackMessage || config.defaultMessage,
        errorType: config.errorType,
    };
}

module.exports = { errorMapper };

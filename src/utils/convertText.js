const charMap = {
    'à': "a'", 'á': "a'", 'è': "e'", 'é': "e'", 'ì': "i'", 'í': "i'",
    'ò': "o'", 'ó': "o'", 'ù': "u'", 'ú': "u'",
    'À': "A'", 'Á': "A'", 'È': "E'", 'É': "E'", 'Ì': "I'", 'Í': "I'",
    'Ò': "O'", 'Ó': "O'", 'Ù': "U'", 'Ú': "U'",
    '€': " Euro",
};

const pattern = new RegExp(`[${Object.keys(charMap).join('')}]`, 'g');

function convertText(text) {
    return text.toString().replace(pattern, (char) => charMap[char]);
}

module.exports = { convertText };

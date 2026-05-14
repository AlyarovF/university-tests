const fs = require('fs');
let data = JSON.parse(fs.readFileSync('data.json'));
data.subjects.forEach(s => {
    if (s.questions) {
        s.questions = s.questions.flat(Infinity);
    }
});
fs.writeFileSync('data.json', JSON.stringify(data, null, 2));

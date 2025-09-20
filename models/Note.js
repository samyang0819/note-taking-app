const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Note title is required'] 
    },
    content: { 
        type: String, 
        required: [true, 'Note content is required'] 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true }); 

module.exports = mongoose.model('Note', noteSchema);

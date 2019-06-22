
const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require("mongodb");
const multer = require('multer');
//const storage = multer.memoryStorage();
//const upload = multer({ dest: './uploads', storage: storage });
const path = require('path');
const cors = require('cors');
const facePlusPlus = require("./functions/face-plus-plus/index.js");
const FACES_COLLECTION = "faces";

const app = express();

app.use(cors({ origin: true }));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

var db;
var ObjectID = mongodb.ObjectID;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test", function (err, client) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = client.db();
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function () {
        var port = server.address().port;
        console.log("App now running on port", port);
    });
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({ "error": message });
}

function createNewFace(dataResponse){
    var face = dataResponse.faces[0];
    var attributes = face.attributes;
    const newFace ={
        userid: 0,
        age: attributes.age.value,
        gender: attributes.gender.value,
        dark_circle: attributes.skinstatus.dark_circle,
        stain: attributes.skinstatus.stain,
        acne: attributes.skinstatus.acne,
        health: attributes.skinstatus.health,
        image: dataResponse.croppedImage,
        createDate: new Date()
    }
    return newFace;
}

// FACES API ROUTES BELOW
app.get('/', (request, response) => {
    response.send('Warming up friend.');
});

/*  "/api/faces"
 *    GET: finds all faces
 *    POST: creates a new face
 */
app.get("/api/faces/:userid", function (req, res) {
    db.collection(FACES_COLLECTION).find({ userid: req.params.userid }).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get faces.");
        } else {
            res.status(200).json(docs);
        }
    });
});

app.post("/api/faces", async function (req, res) {
    //Send Request to Face++
    const dataResponse = await facePlusPlus(req.body);

    //Save new face to Database
    const newFace = createNewFace(dataResponse);
    db.collection(FACES_COLLECTION).insertOne(newFace, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new face.");
        } else {
            res.send(dataResponse);
        }
    });
});

/*  "/api/faces/:id"
 *    GET: find faces by id
 *    DELETE: deletes face by id
 */

app.get("/api/faces/:id", function (req, res) {
    db.collection(FACES_COLLECTION).findOne({ _id: req.params.id }, function (err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get face");
        } else {
            res.status(200).json(doc);
        }
    });
});

app.delete("/api/faces/:id", function (req, res) {
    db.collection(FACES_COLLECTION).deleteOne({ _id: new ObjectID(req.params.id) }, function (err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete contact");
        } else {
            res.status(200).json(req.params.id);
        }
    });
});

// class DetectionWithImageFile extends Detection {
//     detectImage() {
//         const dataForm = this.createFormToDetect({ image_file: this.strImage });
//         return this.doRequest(dataForm, "file");
//     }
// }
// app.post('/face-detection-file', upload.single('fileImage'), async function (req, res) {
//     const fileImage = req.file.buffer;
//     const strategyDetection = new DetectionWithImageFile(fileImage);
//     const response = await strategyDetection.detectImage();
//     if (response.statusCode === 200) {
//         const body = JSON.parse(response.body);
//         const faces = body.faces;
//         const image = await loadImage(base64Image);
//         const imageName = await strategyDetection.hightlightFaces(faces, image);
//         res.send({ imageName: imageName, faces: faces });
//     } else {
//         res.send({});
//     }
// });

const express = require('express');
const rp = require('request-promise');
const app = express();

const { createCanvas, loadImage } = require('canvas');
const cors = require('cors');

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/', (request, response) => {
    response.send('Warming up friend.');
});

app.post('/face-detection-url', async function (req, res) {
    const imageUrl = req.body.imageUrl;
    const strategyDetection = new DetectionWithImageUrl(imageUrl);
    const response = await strategyDetection.detectImage();

    if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        const faces = body.faces;
        const image = await loadImage(imageUrl);
        const imageName = strategyDetection.hightlightFaces(faces,image);
        res.send({ imageName: imageName, faces: faces });
    } else {
        res.send({});
    }
});

app.post('/face-detection-upload', async function (req, res) {
    const base64Image = req.body.base64Image;
    const strategyDetection = new DetectionWithImageUpload(base64Image);
    const response = await strategyDetection.detectImage();
    if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        const faces = body.faces;
        const image = await loadImage(base64Image);
        const imageName = strategyDetection.hightlightFaces(faces,image);
        res.send({ imageName: imageName, faces: faces });
    } else {
        res.send({});
    }
});

app.listen(process.env.PORT || 4000, function(){
    console.log('Your node js server is running');
});

const CANVAS_COLOR = '#28a745';
const HEADERS = {
    'Content-Type': "application/x-www-form-urlencoded"
};

const API = {
    "URL": "https://api-us.faceplusplus.com/facepp/v3/detect",
    "API_KEY": "N6XmyTUrxjI5Q6TBIqiIjx7FIlHSPIJJ",
    "API_SECRET": "uikapL6u72QPPnK23JNbEVwF7SYlOfU8",
    "RETURN_ATTRIBUTES": "gender,age,emotion,skinstatus"
}

class Detection {
    constructor(strImage) {
        this.strImage = strImage;
    }

    async doRequest(formBody) {
        const options = {
            method: 'POST',
            url: API.URL,
            headers: HEADERS,
            form: formBody,
            resolveWithFullResponse: true
        }
        const res = await rp(options);
        return res;
    };

    createFormToDetect(dataImage) {
        const form = {
            api_key: API.API_KEY,
            api_secret: API.API_SECRET,
            return_attributes: API.RETURN_ATTRIBUTES
        };
        return Object.assign(form, dataImage);
    }

    hightlightFaces(faces, image) {
        const canvas = createCanvas(image.width, image.height)
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, image.width, image.height)
        // Now draw boxes around all the faces
        context.strokeStyle = CANVAS_COLOR;
     
        faces.forEach((face, i) => {
           context.lineWidth = '5';
           let face_rectangle = face.face_rectangle;
           context.beginPath();
           const origX = face_rectangle.left;
           const origY = face_rectangle.top;
           context.lineTo(origX, origY);
           context.lineTo(origX + face_rectangle.width, origY);
           context.lineTo(origX + face_rectangle.width, origY + face_rectangle.height);
           context.lineTo(origX, origY + face_rectangle.height);
           context.lineTo(origX, origY);
     
           // Text zone
           const textWidth = 80;
           const textHeight = 30;
           context.font = '20px Impact';
           context.fillStyle = CANVAS_COLOR;
           
           context.fillRect(origX+30, origY + face_rectangle.height+30, textWidth, textHeight);
           
           const strFace = "Face " +(i+1);
           context.fillStyle = "#FFF";
           context.textAlign = "center";
           context.fillText(strFace, origX+30+textWidth/2, origY + face_rectangle.height+40+textHeight/2);
           context.stroke();
     
           context.lineWidth = '2';
           context.moveTo(origX, origY + face_rectangle.height);
           context.lineTo(origX+30, origY + face_rectangle.height+textHeight);
           context.stroke();
        });
        const fs = require('fs');
        const path = require('path');
        const image_name = Date.now()+".png";
        const image_path = __dirname + "/uploads/"+ image_name;
        const out = fs.createWriteStream(image_path);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () =>  console.log('The PNG file was created.'))
        return image_name;
     };
}

class DetectionWithImageUrl extends Detection {
    detectImage() {
        const dataForm = this.createFormToDetect({ image_url: this.strImage });
        return this.doRequest(dataForm);
    }
}

class DetectionWithImageUpload extends Detection {
    detectImage() {
        const dataForm = this.createFormToDetect({ image_base64: this.strImage });
        return this.doRequest(dataForm);
    }
}
(function(){
    const rp = require('request-promise');
    const sharp = require('sharp');
    const { createCanvas, loadImage } = require('canvas');
    const fs = require('fs');
    const path = require("path")

    const CANVAS_COLOR = '#28a745';
    const API = {
        "URL": "https://api-us.faceplusplus.com/facepp/v3/detect",
        "API_KEY": "N6XmyTUrxjI5Q6TBIqiIjx7FIlHSPIJJ",
        "API_SECRET": "uikapL6u72QPPnK23JNbEVwF7SYlOfU8",
        "RETURN_ATTRIBUTES": "gender,age,emotion,skinstatus"
    }

    const EnumTypeRequest = {
        IMAGE_BASE64: 0,
        IMAGE_URL: 1,
        IMAGE_FILE: 2
    };

    let typeRequest;
    function getTypeRequest(body){
        let type;
        if(body.image_base64){
            type = EnumTypeRequest.IMAGE_BASE64;
        } else if(body.image_url){
            type = EnumTypeRequest.IMAGE_URL;
        } else {
            type = EnumTypeRequest.IMAGE_FILE;
        }
        return type;
    }
    function sendRequestToDetectFace(body){
        typeRequest = getTypeRequest(body);
        switch(typeRequest){
            case EnumTypeRequest.IMAGE_BASE64:
                return detectWithImageUpload(body);
            case EnumTypeRequest.IMAGE_URL:
                return detectWithImageUrl(body);
            default:
                return;
        }
    }
    
    async function detectWithImageUrl(body) {
        const imageUrl = body.image_url;
        const strategyDetection = new DetectionWithImageUrl(imageUrl);
        const response = await strategyDetection.detectImage();
    
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            const faces = body.faces;
            const croppedImage = await strategyDetection.cropImage(imageUrl,faces[0].face_rectangle);
            const image = await loadImage(imageUrl);
            const imageName = await strategyDetection.hightlightFaces(faces, image);
            return { imageName: imageName, croppedImage: croppedImage, faces: faces };
        } else {
            return {};
        }
    }
    
    async function detectWithImageUpload(body) {
        const base64Image = body.image_base64;
        const strategyDetection = new DetectionWithImageUpload(base64Image);
        const response = await strategyDetection.detectImage();
        if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            const faces = body.faces;
            const croppedImage = await strategyDetection.cropImage(base64Image,faces[0].face_rectangle);
            const image = await loadImage(base64Image);
            const imageName = await strategyDetection.hightlightFaces(faces, image);
            return { imageName: imageName, croppedImage: croppedImage, faces: faces };
        } else {
            return {};
        }
    }

    function createHeader(type) {
        let contentType = "";
        switch (type) {
            case "urlencoded":
                contentType = "application/x-www-form-urlencoded";
                break;
            case "text":
                contentType = "text/plain";
                break;
            case "file":
                contentType = "multipart/form-data";
                break;
            default:
                contentType = "application/json";
                break;
        }
        return {
            'Content-Type': contentType
        }
    }

    class Detection {
        constructor(strImage) {
            this.strImage = strImage;
        }
    
        async doRequest(formBody, typeHeader) {
            const HEADERS = createHeader(typeHeader);
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
    
        async hightlightFaces(faces, image) {
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
    
                context.fillRect(origX + 30, origY + face_rectangle.height + 30, textWidth, textHeight);
    
                const strFace = "Face " + (i + 1);
                context.fillStyle = "#FFF";
                context.textAlign = "center";
                context.fillText(strFace, origX + 30 + textWidth / 2, origY + face_rectangle.height + 40 + textHeight / 2);
                context.stroke();
    
                context.lineWidth = '2';
                context.moveTo(origX, origY + face_rectangle.height);
                context.lineTo(origX + 30, origY + face_rectangle.height + textHeight);
                context.stroke();
            });
            const image_name = Date.now() + ".jpg";
            await this.createFile(image_name, canvas);
            return image_name;
        };
    
        async cropImage(strImage,face_rectangle){
            let inputImage;
            if(typeRequest == EnumTypeRequest.IMAGE_BASE64) {
                const uri = strImage.split(';base64,').pop();
                inputImage =  Buffer.from(uri, 'base64');
            } else {
                inputImage = strImage;
            }
            const dir = path.join(__dirname, '../../uploads/');
            const outputImage = "crop_" + Date.now() + ".jpg";
            const isSuccessful = await sharp(inputImage).extract(face_rectangle).toFile(dir+outputImage)
                .then(data => {
                    console.log('normal: ', data)
                })
                .catch(err => 
                    console.log(`downisze issue ${err}`));
            return outputImage;
        }
        createFile(image_name, canvas) {
            return new Promise(resolve => {
                const dir = path.join(__dirname, '../../uploads/');
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
                const image_path = dir + image_name;
                const out = fs.createWriteStream(image_path);
                const stream = canvas.createJPEGStream();
                stream.pipe(out);
                out.on('finish', resolve);
            });
        }
    }
    
    class DetectionWithImageUrl extends Detection {
        detectImage() {
            const dataForm = this.createFormToDetect({ image_url: this.strImage });
            return this.doRequest(dataForm, "urlencoded");
        }
    }
    
    class DetectionWithImageUpload extends Detection {
        detectImage() {
            const dataForm = this.createFormToDetect({ image_base64: this.strImage });
            return this.doRequest(dataForm, "urlencoded");
        }
    }
    module.exports = sendRequestToDetectFace
}());


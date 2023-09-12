import {FastifyInstance} from "fastify";
import {fastifyMultipart} from "@fastify/multipart";
import {randomUUID} from "crypto";
import {pipeline} from "stream";
import {promisify} from "util";
import * as path from "path";
import * as fs from "fs";
import {prisma} from "../lib/prisma";
// import path = require("node:path");

const pump = promisify(pipeline)

export async function uploadVideoRoute(app:FastifyInstance){
    app.register(fastifyMultipart,{
        limits:{
            fileSize: 1_048_576 * 20 // 20MB
        }
    })
    app.post('/videos', async(req, res)=>{
        const data = await req.file()
        if(!data){
            return res.status(400).send({error: 'Missing file input.'})
        }

        const extension = path.extname(data.filename)

        if(extension!=='.mp3'){
            return res.status(400).send({error: 'Invalid input type, please upload a MP3.'})
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination))

        const video = await prisma.video.create({
            data:{
                name: data.filename,
                path: uploadDestination
            }
        })

        return {video}
    })
}
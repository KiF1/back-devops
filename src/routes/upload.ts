import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { FastifyInstance } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION!, 
  credentials: 
    { 
      accessKeyId: process.env.AWS_ACCESS_KEY!, 
      secretAccessKey: process.env.AWS_SECRET_KEY!
    } 
  })

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/upload', async (request, reply) => {
    const upload = await request.file({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    })

    if (!upload) {
      return reply.status(400).send()
    }

    const mimeTypeRegex = /^(image|video)\/[a-zA-Z]+/
    const isValidFileFormat = mimeTypeRegex.test(upload.mimetype)

    if (!isValidFileFormat) {
      return reply.status(400).send()
    }

    const fileId = randomUUID()
    const extension = extname(upload.filename)
    const fileName = fileId.concat(extension)

    const bucketName = process.env.AWS_BUCKET

    const fileBuffer: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      upload.file.on('data', (chunk) => chunks.push(chunk))
      upload.file.on('end', () => resolve(Buffer.concat(chunks)))
      upload.file.on('error', reject)
    })

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: upload.mimetype,
    }

    try {
      await s3Client.send(new PutObjectCommand(uploadParams))
    } catch (err) {
      console.error(err)
      return reply.status(500).send()
    }

    const fullUrl = request.protocol.concat('://').concat(request.hostname)
    const fileUrl = new URL(`https://${bucketName}.s3.amazonaws.com/${fileName}`).toString()

    return { fileUrl }
  })
}

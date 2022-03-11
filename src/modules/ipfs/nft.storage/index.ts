import fs from 'fs'
import path from 'path'
import { fromDwebLink } from '..'
import { PinFileResponse } from '../types'

export default async function uploadFile(file: File): Promise<PinFileResponse> {
  try {
    // console.log('file from devserver:', file)
    const response = await fetch('https://api.nft.storage/upload', {
      //@ts-ignore
      body: fs.createReadStream(file.filepath),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NFT_STORAGE_API_KEY || ''}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    // console.log('Upload File Response:', response)
    const json = await response.json()
    if (!json.ok) {
      return {
        error: json.error?.code + ': ' + json.error?.message,
        uri: '',
        name: file.name || '',
        type: file.type || '',
      }
    }
    console.log('here we go!!!', path)
    const ext = path.extname(file.filepath).replace('.', '')
    return {
      error: undefined,
      uri: fromDwebLink(json.value.cid) + `?ext=${ext}`,
      name: file.name || '',
      type: file.type || '',
    }
  } catch (error) {
    console.error(error)
    return {
      error: 'Upload error',
      uri: undefined,
      name: file.name || '',
      type: file.type || '',
    }
  }
}

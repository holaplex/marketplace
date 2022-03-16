import ipfsSDK from '@/modules/ipfs/client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

interface UploadFileProps {
  setNewFileUrl: (url: string) => void
  type: string
}

const UploadFile = ({ setNewFileUrl, type }: UploadFileProps) => {
  const {
    register,
    watch,
    formState: { errors: errors },
  } = useForm()
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    const subscription = watch(async (data) => {
      const file = data[type][0]
      if (!file) {
        return
      }
      //const localFileUrl = URL.createObjectURL(file)
      setUploading(true)
      const { uri } = await ipfsSDK.uploadFile(file)
      console.log('new ipfs url', uri)
      setNewFileUrl(uri)
      setUploading(false)
    })
    return () => subscription.unsubscribe()
  }, [watch, uploading])
  return (
    <div className="flex items-center">
      <form>
        <input
          type="file"
          id={type}
          {...register(`${type}`)}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <label htmlFor={type} className="button small grow-0 cursor-pointer">
          {uploading ? 'Uploading...' : 'Update'}
        </label>
      </form>
    </div>
  )
}

export default UploadFile

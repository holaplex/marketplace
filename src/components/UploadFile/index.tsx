import ipfsSDK from './../../modules/ipfs/client'
import { useEffect, useState } from 'react'
import { useForm, ChangeHandler, InternalFieldName } from 'react-hook-form'
import { TailSpin } from 'react-loader-spinner';

interface UploadFileProps {
  onChange: (...event: any) => void;
  name: InternalFieldName;
}

const UploadFile = ({ onChange, name }: UploadFileProps) => {
  const {
    watch,
    register,
  } = useForm();
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    const subscription = watch(async ({ upload }) => {
      const file = upload[0];

      if (!file) {
        return
      }

      setUploading(true);

      const uploaded = await ipfsSDK.uploadFile(file);

      onChange(uploaded);

      setUploading(false);
    });

    return () => subscription.unsubscribe()
  }, [watch, onChange]);

  return (
    <div className="flex items-center">
      <form>
        <input
          {...register("upload")}
          type="file"
          id={name}
          className="hidden"
          disabled={uploading}
        />
        <label htmlFor={name} className="button small grow-0 cursor-pointer">
          {uploading && (
            <TailSpin
              height="14px"
              width="14px"
              color="black"
              ariaLabel="loading"
              wrapperClass="inline aspect-square mr-1"
            />
          )}
          {uploading ? 'Uploading' : 'Update'}
        </label>
      </form>
    </div>
  )
}

export default UploadFile

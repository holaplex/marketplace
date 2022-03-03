interface AvatarProps {
  name: string
  url?: string
}

const Avatar = ({ name, url }: AvatarProps) => (
  <div className="flex items-center">
    {url && <img src={url} alt="label" className="h-5 rounded-full mr-2" />}
    <div>{name}</div>
  </div>
)

export default Avatar;
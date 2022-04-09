interface AvatarProps {
  name: string
  url?: string
  className?: string
}

const Avatar = ({ name, url, className }: AvatarProps) => (
  <div className="flex items-center">
    {url && <img src={url} alt="label" className="h-5 rounded-full mr-2" />}
    <div className={className || ''}>{name}</div>
  </div>
)

export default Avatar

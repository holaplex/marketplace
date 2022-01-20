type Props = {
  children: JSX.Element | string
  onClick: React.MouseEventHandler<HTMLButtonElement>
}

export const Button = ({ children, onClick }: Props) => (
  <button
    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    onClick={onClick}
  >
    {children}
  </button>
)

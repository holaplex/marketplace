import { TailSpin } from 'react-loader-spinner'
import cx from 'classnames'
import { cond, equals, always, not } from 'ramda'

export enum ButtonType {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary',
}

export enum ButtonSize {
  Small = 'sm',
  Large = 'lg',
}

interface ButtonProps {
  children?: any
  htmlType?: 'button' | 'submit' | 'reset' | undefined
  size?: ButtonSize
  block?: boolean
  type?: ButtonType
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactElement
  className?: string
  onClick?: () => any
}

const isPrimary = equals(ButtonType.Primary)
const isSecondary = equals(ButtonType.Secondary)
const isTertiary = equals(ButtonType.Tertiary)
const isLarge = equals(ButtonSize.Large)
const isSmall = equals(ButtonSize.Small)

const Button = ({
  children,
  icon,
  size = ButtonSize.Large,
  htmlType = 'button',
  disabled = false,
  loading = false,
  type = ButtonType.Primary,
  className = '',
  block = false,
  onClick,
}: ButtonProps) => {
  return (
    <button
      className={cx(
        className,
        'flex items-center text-center font-semibold justify-center duration-150 rounded-full focus:shadow-outline transition-transform',
        {
          'w-full': block,
          'text-gray-900 bg-white': isPrimary(type),
          'text-white bg-gray-900': isSecondary(type),
          'text-gray-300 bg-gray-700': isTertiary(type),
          'text-xs md:text-sm p-2': isSmall(size),
          'p-4': isLarge(size),
          'opacity-75': disabled,
          'hover:scale-105': not(disabled),
        }
      )}
      disabled={disabled}
      type={htmlType}
      onClick={onClick}
    >
      {loading && (
        <TailSpin
          height="20px"
          width="20px"
          color={cond([
            [isPrimary, always('grey')],
            [isSecondary, always('white')],
          ])(type)}
          ariaLabel="loading"
          wrapperClass="inline aspect-square mr-1"
        />
      )}
      {icon && icon}
      {children}
    </button>
  )
}

export default Button

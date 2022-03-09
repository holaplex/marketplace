import { TailSpin } from 'react-loader-spinner';
import cx from 'classnames';
import { cond, equals, always } from 'ramda';

export enum ButtonType {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary',
}

export enum ButtonSize {
  Small = 'sm',
  Large = 'lg',
};

interface ButtonProps {
  children?: any;
  htmlType?: 'button' | 'submit' | 'reset' | undefined;
  size?: ButtonSize;
  block?: boolean;
  type?: ButtonType;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => any;
}

const isPrimary = equals(ButtonType.Primary);
const isSecondary = equals(ButtonType.Secondary);
const isTertiary = equals(ButtonType.Tertiary);
const isLarge = equals(ButtonSize.Large);
const isSmall = equals(ButtonSize.Small);

const Button = ({
  children,
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
        'block relative duration-150 rounded-full focus:shadow-outline hover:scale-[1.02] transition-transform grow',
        {
          'w-full': block,
          'text-black bg-white': isPrimary(type),
          'text-white bg-gray-900': isSecondary(type),
          'text-gray-300 bg-gray-700': isTertiary(type),
          'text-sm p-2': isSmall(size),
          'p-4': isLarge(size),
        }
      )}
      disabled={disabled}
      type={htmlType}
      onClick={onClick}
    >
        {loading && (
          <TailSpin
            height="2rem"
            width="2rem"
            color={cond(
              [
                [isPrimary, always("grey")],
                [isSecondary, always("white")],
              ]
              )(type)}
            ariaLabel="loading"
            wrapperClass="absolute left-4 top-2 w-8 aspect-square"
          />
        )}
        {children}
    </button>
  );
};

export default Button;
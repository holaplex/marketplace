import { TailSpin } from 'react-loader-spinner';
import cx from 'classnames';
import { cond, equals, always } from 'ramda';

export enum ButtonType {
  Primary = 'primary',
  Secondary = 'secondary',
  Tertiary = 'tertiary',
}

interface ButtonProps {
  children?: any;
  htmlType?: 'button' | 'submit' | 'reset' | undefined;
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

const Button = ({
  children,
  htmlType = 'button',
  disabled = false,
  loading = false,
  type = ButtonType.Primary,
  className = '',
  block = true,
  onClick,
}: ButtonProps) => {

  return (
    <button
      className={cx(
        className,
        'relative block h-12 text-sm transition-colors duration-150 rounded-full lg:text-xl md:text-base focus:shadow-outline',
        {
          'w-full': block,
          'text-black bg-white': isPrimary(type),
          'text-white bg-gray-900': isSecondary(type),
          'text-gray-300 bg-gray-700': isTertiary(type),
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
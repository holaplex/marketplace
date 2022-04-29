import { DollarSign, User, Image as ImageIcon, Circle } from 'react-feather'
import { Link } from 'react-router-dom'
import cx from 'classnames'

export enum AdminMenuItemType {
  Marketplace,
  Creators,
  Financials,
  Tokens,
}

export interface AdminMenuItem {
  type: AdminMenuItemType
  name: string
  url: string
  icon: JSX.Element
}

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    type: AdminMenuItemType.Marketplace,
    name: 'Marketplace',
    url: '/admin/marketplace/edit',
    icon: <ImageIcon color="white" size="1rem" />,
  },
  {
    type: AdminMenuItemType.Creators,
    name: 'Creators',
    url: '/admin/creators/edit',
    icon: <User color="white" size="1rem" />,
  },
  {
    type: AdminMenuItemType.Financials,
    name: 'Financials',
    url: '/admin/financials/edit',
    icon: <DollarSign color="white" size="1rem" />,
  },
  {
    type: AdminMenuItemType.Tokens,
    name: 'Supported Tokens',
    url: '/admin/tokens/edit',
    icon: <Circle color="white" size="1rem" />,
  },
]

interface Props {
  selectedItem: AdminMenuItemType
}

const AdminMenu = ({ selectedItem }: Props) => (
  <div>
    <ul className="flex flex-col flex-grow gap-2">
      {ADMIN_MENU_ITEMS.map((item) => (
        <li
          key={item.type}
          className={cx('p-2 rounded', {
            'bg-gray-800': selectedItem === item.type,
          })}
        >
          <Link className="flex flex-row items-center w-full" to={item.url}>
            <div className="mr-2">{item.icon}</div>
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

export default AdminMenu

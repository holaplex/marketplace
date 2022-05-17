import { DollarSign, User, Image as ImageIcon, Circle } from 'react-feather'
import cx from 'classnames'
import Link from 'next/link'

export enum AdminMenuItemType {
  Marketplace,
  Creators,
  Financials,
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
          <Link href={item.url}>
            <a className="flex flex-row items-center w-full">
              <div className="mr-2">{item.icon}</div>
              {item.name}
            </a>
          </Link>
        </li>
      ))}
    </ul>
  </div>
)

export default AdminMenu

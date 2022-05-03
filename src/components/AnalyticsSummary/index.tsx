import { Link } from 'react-router-dom'
import { toSOL } from 'src/modules/lamports'
import { MintStats, PriceChart } from '../../types'
import Button, { ButtonSize, ButtonType } from '../Button'
import Chart from '../Chart'

interface Props {
  loading: boolean
  stats?: MintStats
  charts?: PriceChart
  analyticsUrl: string
}

const AnalyticsSummary = ({ loading, stats, charts, analyticsUrl }: Props) => {
  return (
    <div className="col-span-12 lg:col-span-4 grid grid-cols-3 gap-x-1 gap-y-6 lg:-mt-8">
      <div className="col-span-1">
        <span className="text-gray-300 uppercase font-semibold text-xs block w-full mb-2">
          Floor
        </span>
        {loading ? (
          <div className="block bg-gray-800 w-20 h-6 rounded" />
        ) : (
          <span className="sol-amount text-xl font-semibold">
            {toSOL((stats?.floor.toNumber() || 0) as number)}
          </span>
        )}
      </div>
      <div className="col-span-1">
        <span className="text-gray-300 uppercase font-semibold text-xs block w-full mb-2">
          Vol Last 24h
        </span>
        {loading ? (
          <div className="block bg-gray-800 w-20 h-6 rounded" />
        ) : (
          <span className="sol-amount text-xl font-semibold">
            {toSOL((stats?.volume24hr.toNumber() || 0) as number)}
          </span>
        )}
      </div>
      <Link
        to={analyticsUrl}
        className="col-span-1 lg:col-span-2 flex justify-end"
      >
        <Button
          size={ButtonSize.Small}
          type={ButtonType.Secondary}
          icon={<img src="/images/analytics_icon.svg" className="mr-2" />}
        >
          Details & Activity
        </Button>
      </Link>
      <div className="col-span-3 lg:col-span-4">
        <div className="flex flex-col w-full">
          <span className="uppercase text-gray-300 text-xs font-semibold mb-1 place-self-end">
            Price LAST 7 DAYS
          </span>
          {loading ? (
            <div className="w-full h-[120px] bg-gray-800 rounded" />
          ) : (
            <Chart
              height={120}
              showXAxis={false}
              className="w-full"
              chartData={charts?.salesAverage}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsSummary

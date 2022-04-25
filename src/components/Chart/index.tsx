import cx from 'classnames'
import { format, parseISO, subDays } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { toSOL } from 'src/modules/lamports'
import { PricePoint } from 'src/types'

interface ChartProps {
  className?: string
  chartName?: string
  chartData?: PricePoint[]
}

const Chart = ({ className = '', chartName = '', chartData }: ChartProps) => {
  const actualData: any[] | undefined = []
  chartData &&
    chartData.forEach((cd) => {
      actualData.push({
        date: cd.date.substr(0, 10),
        price: toSOL(cd.price.toNumber()), // 1 + Math.random()
      })
    })

  if (actualData.length == 0) return null
  return (
    <div className={cx(className, '')}>
      <div className="flex flex-col">
        <span className="uppercase text-gray-300 font-semibold mb-6">{`${chartName} LAST 7 DAYS`}</span>
        <ResponsiveContainer className="-ml-8" width="100%" height={200}>
          <AreaChart
            data={actualData}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <Area
              dataKey="price"
              stroke="#525252"
              strokeWidth={3}
              fill="#525252"
              fillOpacity={0.2}
              type="monotone"
            />
            <YAxis
              dataKey="price"
              axisLine={false}
              tickLine={false}
              tickCount={3}
              tickFormatter={(number, index) => {
                if (index > 0) {
                  return `${number.toFixed(1)}`
                }
                return ''
              }}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickCount={7}
              tickFormatter={(str) => {
                const date = parseISO(str)
                return format(date, 'M/d')
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Chart

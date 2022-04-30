import cx from 'classnames'
import { format, parseISO } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { toSOL } from '../../modules/lamports'
import { PricePoint } from '../../types'

interface ChartProps {
  height?: number
  showXAxis?: boolean
  className?: string
  chartData?: PricePoint[]
}

const Chart = ({
  height = 200,
  showXAxis = true,
  className = '',
  chartData,
}: ChartProps) => {
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
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={actualData}>
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
            if (showXAxis) {
              const date = parseISO(str)
              return format(date, 'M/d')
            }
            return ''
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default Chart

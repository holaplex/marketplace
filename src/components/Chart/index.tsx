import { format, parseISO } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { toSOL } from '../../modules/sol'
import { PricePoint } from '@holaplex/marketplace-js-sdk'
import BN from 'bn.js'

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
      const price = new BN(cd.price)
      actualData.push({
        date: cd.date.substr(0, 10),
        price: toSOL(price.toNumber()), // 1 + Math.random()
      })
    })

  if (actualData.length == 0) return null
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart
        data={actualData}
        height={height}
        margin={{
          top: 10,
          right: 0,
          left: -30,
          bottom: 0,
        }}
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

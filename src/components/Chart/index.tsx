import cx from 'classnames'
import { format, parseISO, subDays } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface ChartProps {
  className?: string
  chartName?: string
}

const Chart = ({ className = '', chartName = '' }: ChartProps) => {
  const dummyData = []
  for (let num = 6; num >= 0; num--) {
    dummyData.push({
      date: subDays(new Date(), num).toISOString().substr(0, 10),
      value: 1 + Math.random(),
    })
  }
  return (
    <div className={cx(className, '')}>
      <div className="flex flex-col">
        <span className="uppercase text-gray-300 font-semibold mb-6">{`${chartName} LAST 7 DAYS`}</span>
        <ResponsiveContainer className="-ml-8" width="100%" height={200}>
          <AreaChart
            data={dummyData}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <Area
              dataKey="value"
              stroke="#525252"
              strokeWidth={3}
              fill="#525252"
              fillOpacity={0.2}
              type="monotone"
            />
            <YAxis
              dataKey="value"
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

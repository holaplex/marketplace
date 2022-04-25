import Countdown from 'react-countdown'

interface DropCountdownProps {
  date: Date | undefined
  prefix?: string
  status?: string
  onComplete?: () => void
}

interface DropCountdownRender {
  days: number
  hours: number
  minutes: number
  seconds: number
  completed: boolean
}

export const DropCountdown: React.FC<DropCountdownProps> = ({
  date,
  prefix,
  status,
  onComplete,
}) => {
  const renderCountdown = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: DropCountdownRender) => {
    hours += days * 24
    if (completed) {
      return status ? <span>{status}</span> : null
    } else {
      return (
        <div className="flex content-center items-center justify-end">
          <div className="pr-1">{prefix}</div>
          <div className="pr-1">
            <span className="font-bold flex-col">
              {hours < 10 ? `0${hours}` : hours}
            </span>
            <span>h</span> :
          </div>
          <div className="pr-1">
            <span className="font-bold flex-col">
              {minutes < 10 ? `0${minutes}` : minutes}
            </span>
            <span>m</span> :
          </div>
          <div className="pr-1">
            <span className="font-bold flex-col">
              {seconds < 10 ? `0${seconds}` : seconds}
            </span>
            <span>s</span>
          </div>
        </div>
      )
    }
  }

  if (date) {
    return (
      <Countdown
        date={date}
        onComplete={onComplete}
        renderer={renderCountdown}
      />
    )
  } else {
    return null
  }
}

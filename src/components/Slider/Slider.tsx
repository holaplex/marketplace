import Carousel, { CarouselProps } from 'react-multi-carousel'
import cx from 'classnames'

export const Slider = ({ className, ...props }: CarouselProps) => (
  <Carousel {...props} className={cx('app-slider', className)} />
)

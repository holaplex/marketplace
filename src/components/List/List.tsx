import React, { useMemo } from 'react';
import { KeyType } from '../../types';
import { isEmpty, prepend, range, map, toPairs, pipe, join, equals, nth, ifElse } from 'ramda';
import cx from 'classnames';

interface GridSlot {
  cols: number;
  gap: number;
}

interface ListGrid {
  xs: GridSlot;
  sm?: GridSlot;
  md?: GridSlot;
  lg?: GridSlot;
  xl?: GridSlot;
}

interface ListProps<D> {
  itemRender: (item: D, index: number) => React.ReactNode,
  data: D[] | undefined,
  dataKey?: string,
  loading: boolean,
  emptyComponent: React.ReactNode,
  loadingComponent: React.ReactNode,
  loadingCount?: number;
  grid: ListGrid,
}

export function List<D extends KeyType>({
  itemRender,
  data,
  loading,
  grid,
  emptyComponent,
  loadingComponent,
  dataKey = 'address',
  loadingCount = 12,
}: ListProps<D>) {
  const gridClassName = useMemo(() => pipe(
      toPairs,
      map(ifElse(
        pipe(nth(0), equals("xs")),
        ([_, { cols, gap }]: [string, GridSlot]) => `grid-cols-${cols} gap-${gap}`,
        ([size, { cols, gap }]: [string, GridSlot]) => `${size}:grid-cols-${cols} ${size}:gap-${gap}`,
      )),
      prepend('grid'),
      join(' ')
    )(grid) as string,
    [grid]
  );
  
  return (
    <div className="container md:mx-auto lg:mx-auto">
      {loading ? (
        <ul className={gridClassName}>
          {map((i: number) => (
            <li key={i}>
              {loadingComponent}
            </li>
          )
          )(range(0, loadingCount))}
        </ul>
      ) : (
        isEmpty(data) ? (
          emptyComponent
        ) : (
          <ul className={gridClassName}>
            {(data || []).map((d, i) => {
              return (
                <li key={d[dataKey]}>
                  {itemRender(d, i)}
                </li>
              )
            })}
          </ul>
        )
      )}
    </div>
  )
}



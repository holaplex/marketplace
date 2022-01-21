import Image from 'next/image'

type Props = {
  name: String
  creators: Array<String>
}

export const NFTCard = ({ name, creators }: Props) => (
  <>
    <article className='mx-auto group w-full shadow-2xl max-w-md pb-8 rounded-b-2xl transform duration-500 hover:-translate-y-2 cursor-pointer'>
      <section
        className='content bg-cover bg-center h-64 rounded-2xl'
        style={{backgroundImage: 'url(http://placekitten.com/200/200)'}}
      >
        <div className='flex items-end w-full h-full bg-black bg-opacity-20 text-white text-sm font-bold  p-4 rounded-2xl'>

        </div>
        <div>
            <p><b>{name}</b></p>
            {creators.map((c: string)=>(<p>{c.substring(0,4) + "..." + c.slice(-4)}</p>))}
        </div>

      </section>
    </article>
  </>
)

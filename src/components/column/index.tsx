import type { FixedColumnID } from "@shared/types"
import { useTitle } from "react-use"
import { NavBar } from "../navbar"
import { Dnd } from "./dnd"
import { currentColumnIDAtom } from "~/atoms"

export function Column({ id }: { id: FixedColumnID }) {
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    setCurrentColumnID(id)
  }, [id, setCurrentColumnID])

  useTitle(`NewsHub | ${metadata[id].name}`)

  return (
    <>
      <h1 className="sr-only">
        NewsHub —
        {metadata[id].name}
        {" "}
        实时科技与开发者新闻聚合
      </h1>
      <div className="flex justify-center md:hidden mb-2">
        <NavBar />
      </div>
      {id === currentColumnID && <Dnd />}
    </>
  )
}

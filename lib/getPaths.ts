/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
export default function getPaths(path: string) {
    const paths = [path]
    const pathSeqments = [] as string[]
    const addr = [path]
    let pathSeqment = popPathSeqment(addr)
    while (pathSeqment) {
        pathSeqments.push(pathSeqment)
        paths.push(addr[0])
        pathSeqment = popPathSeqment(addr)
    }
    pathSeqments.push(paths[paths.length - 1])
    return {
        paths,
        seqments: pathSeqments
    }
}

export function basename(path: string) {
    return popPathSeqment([path])
}

function popPathSeqment(pathInArray: string[]) {
    const i = pathInArray[0].lastIndexOf('/')
    const j = pathInArray[0].lastIndexOf('\\')
    const p = i < 0 ? j : j < 0 ? i : i < j ? j : i
    if (p < 0) {
        return null
    }
    const s = pathInArray[0].substr(p + 1)
    pathInArray[0] = pathInArray[0].substr(0, p || 1)
    return s
}

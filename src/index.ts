import $ from "jquery"
import paper from "paper"

$(document).ready(() => {
  const canvas = $("#canvas")[0] as HTMLCanvasElement

  paper.setup(canvas)

  const tool = new paper.Tool()
  tool.minDistance = 10
  tool.activate()

  let isPlacing = false
  let path: paper.Path | undefined
  let pathPreview: paper.Path | undefined
  let lastMouseDown: paper.Point | undefined

  let handles: paper.Item[] = []

  const drawHandlesForSegment = (
    seg: paper.Segment,
    type: "both" | "in" | "out" = "both"
  ): void => {
    if (!seg) {
      return
    }

    const path = new paper.Path()
    if (type !== "out") {
      path.add(seg.point.add(seg.handleIn))
    }
    path.add(seg.point)
    if (type !== "in") {
      path.add(seg.point.add(seg.handleOut))
    }
    path.strokeWidth = 1
    path.strokeColor = new paper.Color("lightblue")

    const circle = new paper.Path.Circle(seg.point, 5)
    circle.strokeColor = new paper.Color("lightblue")
    circle.fillColor = new paper.Color("white")

    handles.push(path, circle)

    if (
      seg.handleIn &&
      seg.handleIn.getDistance(new paper.Point(0, 0)) >= 10 &&
      type !== "out"
    ) {
      const circleIn = new paper.Path.Circle(seg.point.add(seg.handleIn), 3)
      circleIn.strokeColor = new paper.Color("lightblue")
      circleIn.fillColor = new paper.Color("white")
      handles.push(circleIn)
    }

    if (
      seg.handleOut &&
      seg.handleOut.getDistance(new paper.Point(0, 0)) >= 10 &&
      type !== "in"
    ) {
      const circleOut = new paper.Path.Circle(seg.point.add(seg.handleOut), 3)
      circleOut.strokeColor = new paper.Color("lightblue")
      circleOut.fillColor = new paper.Color("white")
      handles.push(circleOut)
    }
  }

  const clearSegmentHandles = () => {
    handles.forEach(item => item.remove())
    handles = []
  }

  const updateHandles = (): void => {
    clearSegmentHandles()
    if (path) {
      const lastSeg = path.lastSegment

      drawHandlesForSegment(lastSeg, lastMouseDown == null ? "both" : "out")
    }

    if (pathPreview) {
      drawHandlesForSegment(pathPreview.lastSegment)
    }
  }

  tool.onMouseDown = (event: paper.MouseEvent) => {
    if (!isPlacing) {
      pathPreview = new paper.Path()
      pathPreview.strokeColor = new paper.Color("lightblue")
      pathPreview.add(event.point)

      path = new paper.Path()
      path.strokeColor = new paper.Color("red")
      path.strokeWidth = 3
      path.strokeCap = "round"
      path.strokeJoin = "round"
      path.dashArray = [10, 10]
      path.add(event.point)

      isPlacing = true
      return
    }

    lastMouseDown = event.point
  }

  const createPreviewPath = (point: paper.Point) => {
    if (!pathPreview || !path) {
      return
    }
    pathPreview.removeSegments()
    pathPreview.add(
      new paper.Segment(
        path.lastSegment.point,
        path.lastSegment.handleIn,
        path.lastSegment.handleOut
      )
    )

    const newPreviewSegment = new paper.Segment(point, undefined, undefined)

    pathPreview.add(newPreviewSegment)
    if (lastMouseDown != null) {
      pathPreview.lastSegment.handleIn = point.subtract(lastMouseDown)
      pathPreview.lastSegment.handleOut = lastMouseDown.subtract(point)
    }

    updateHandles()
  }

  tool.onMouseMove = (event: paper.MouseEvent) => {
    if (!pathPreview || !path || !isPlacing) {
      return
    }
    createPreviewPath(event.point)
  }

  tool.onMouseDrag = (event: paper.MouseEvent) => {
    if (!pathPreview || !path || !lastMouseDown) {
      return
    }
    pathPreview.lastSegment.handleOut = event.point.subtract(lastMouseDown)
    pathPreview.lastSegment.handleIn = lastMouseDown.subtract(event.point)
    updateHandles()
  }

  tool.onMouseUp = (event: paper.MouseEvent) => {
    if (!path || !pathPreview || !lastMouseDown) {
      return
    }
    path.add(new paper.Segment(pathPreview.lastSegment))
    updateHandles()

    lastMouseDown = undefined

    pathPreview.removeSegments()
    createPreviewPath(event.point)
  }

  tool.onKeyDown = (event: paper.KeyEvent) => {
    if (!path || !pathPreview || !isPlacing) {
      return
    }

    if (event.key === "enter" || event.key === "escape") {
      isPlacing = false
      pathPreview?.remove()
      path.selected = false
      clearSegmentHandles()
    } else if (
      event.key === "z" &&
      (event.modifiers.command || event.modifiers.control)
    ) {
      if (path.segments.length > 1) {
        path.removeSegment(path.lastSegment.index)

        if (path.segments.length <= 1) {
          pathPreview.remove()
          isPlacing = false
        }

        const lastPreviewPoint = pathPreview.lastSegment.point
        pathPreview.removeSegments()
        createPreviewPath(lastPreviewPoint)
      }
    }
  }
})

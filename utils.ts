import { createDefine } from "fresh"

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string
}

// Create a typed helper for middleware/routes
export const define = createDefine<State>()

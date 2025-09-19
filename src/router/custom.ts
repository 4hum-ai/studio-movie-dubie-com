import type { RouteRecordRaw } from 'vue-router'

// Place any app-specific routes here. Keep generic routes in generic.ts.
export const customRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/design',
    component: () => import('../views/admin/Design.vue'),
    meta: { title: 'Design System', requiresAuth: true },
  },
  // Title detail override to add specialized behaviors
  {
    path: '/titles/:id',
    component: () => import('../views/TitleDetail.vue'),
    meta: { title: 'Title Detail', requiresAuth: true, module: 'titles', keepAlive: true },
  },
  // Editor route for a specific media item under a title
  {
    path: '/titles/:id/media/:mediaId/editor',
    component: () => import('../views/TitlesMediaEditor.vue'),
    meta: { title: 'Media Editor', requiresAuth: true, module: 'titles' },
  },
]

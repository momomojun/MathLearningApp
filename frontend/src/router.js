import { createRouter, createWebHistory } from 'vue-router'
import ExercisesPage from './views/ExercisesPage.vue'
import HomePage from './views/HomePage.vue'
import KnowledgePage from './views/KnowledgePage.vue'
import LoginPage from './views/LoginPage.vue'
import MembershipPage from './views/MembershipPage.vue'
import ProfilePage from './views/ProfilePage.vue'
import RegisterPage from './views/RegisterPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/knowledge', component: KnowledgePage },
    { path: '/exercises', component: ExercisesPage },
    { path: '/membership', component: MembershipPage },
    { path: '/profile', component: ProfilePage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
  ],
})

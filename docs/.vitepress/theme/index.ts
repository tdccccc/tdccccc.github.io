import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import 'katex/dist/katex.min.css'
import './custom.css'
import AtlasHome from './components/AtlasHome.vue'
import PostsIndex from './components/PostsIndex.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import RlBetaTiltWidget from './components/RlBetaTiltWidget.vue'
import RlPpoClipWidget from './components/RlPpoClipWidget.vue'
import RlGroupAdvantageWidget from './components/RlGroupAdvantageWidget.vue'
import EvalStatsPowerWidget from './components/EvalStatsPowerWidget.vue'
import EvalPassKWidget from './components/EvalPassKWidget.vue'
import EvalJudgeBiasWidget from './components/EvalJudgeBiasWidget.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(ImageLightbox),
    })
  },
  enhanceApp({ app }) {
    app.component('AtlasHome', AtlasHome)
    app.component('PostsIndex', PostsIndex)
    app.component('RlBetaTiltWidget', RlBetaTiltWidget)
    app.component('RlPpoClipWidget', RlPpoClipWidget)
    app.component('RlGroupAdvantageWidget', RlGroupAdvantageWidget)
    app.component('EvalStatsPowerWidget', EvalStatsPowerWidget)
    app.component('EvalPassKWidget', EvalPassKWidget)
    app.component('EvalJudgeBiasWidget', EvalJudgeBiasWidget)
  },
}

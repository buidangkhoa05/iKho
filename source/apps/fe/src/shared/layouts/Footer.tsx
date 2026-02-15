import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="w-full border-t border-primary/10 bg-secondary dark:bg-slate-950 dark:border-slate-800 py-6 text-secondary-foreground dark:text-gray-400">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row md:py-0 px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-secondary-foreground/80 md:text-left dark:text-gray-400">
            {t('footer.built_with')}
          </p>
        </div>
        <div className="flex gap-4">
          <a
            href="https://github.com/tanstack/router"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline underline-offset-4 text-secondary-foreground/80 hover:text-secondary-foreground dark:text-gray-400 dark:hover:text-gray-50"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

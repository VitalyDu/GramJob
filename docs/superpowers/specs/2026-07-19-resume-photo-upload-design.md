# Загрузка фото в резюме

**Дата:** 2026-07-19

## Контекст

`Resume` уже имеет поле `avatar: StrapiMedia` в контент-типе и `avatar: true` в `RESUME_POPULATE` контроллера, но:

- `ResumeCreateInput` не содержит `avatar`
- Бэкенд в `create`/`update` не принимает `avatar`
- `ResumeForm` не отображает поле загрузки фото

## Функциональность

- Загрузка фото при создании и редактировании резюме
- Превью загруженного изображения до сабмита формы
- Замена существующего фото
- Удаление существующего фото (передаётся `avatar: null` в API)

## Подход

Моментальная загрузка при выборе файла (как `LogoUploader`): пользователь выбирает файл → файл сразу загружается через `uploadFile()` → `{id, url}` сохраняется в state формы → при сабмите ID передаётся вместе с остальными полями.

## Изменения

### Backend

**`backend/src/api/resume/services/resume.ts`**

- Добавить `avatar?: number` в тип `CreateResumeInput`
- Передать `...(input.avatar !== undefined ? { avatar: input.avatar } : {})` в `strapi.documents.create()`

**`backend/src/api/resume/controllers/resume.ts`**

- `create`: извлечь `avatarId = body.avatar`, валидировать что это положительное целое число (если передано; `null` при создании игнорируется — нечего удалять), передать в сервис только если `avatarId` определён и не null
- `update`: добавить `'avatar'` в массив `allowedFields`; после цикла allowedFields валидировать: если `'avatar' in updateData`, то значение должно быть `null` или положительным целым
- `RESUME_POPULATE` уже содержит `avatar: true` — ничего менять не нужно

### Frontend

**`frontend/src/types/api.ts`**

- Добавить `avatar?: number | null` в `ResumeCreateInput`

**Новый `frontend/src/components/resume/ResumePhotoUploader.tsx`**

Props:

```typescript
interface ResumePhotoUploaderProps {
  currentPhotoUrl: string | null
  onUploadComplete: (result: { id: number; url: string }) => void
  onRemove: () => void
  disabled?: boolean
}
```

Поведение:

- Нет фото: placeholder (иконка `UserRound`) + кнопка «Загрузить фото»
- Есть фото: `<img>` превью (rounded-full) + кнопка «Заменить» + кнопка «Удалить»
- Внутреннее состояние: `isUploading`, `error`
- `uploadFile()` вызывается внутри компонента; при ошибке — текст ошибки под кнопками
- `accept="image/png,image/jpeg,image/webp"` на file input

**`frontend/src/components/resume/ResumeForm.tsx`**

- Новый prop: `defaultAvatar?: StrapiMedia | null`
- Добавить `avatar: z.number().int().positive().nullable().default(null)` в схему (в `_baseSchema` и в memoized `schema`)
- `defaultValues.avatar` инициализируется из `defaultAvatar?.id ?? null`
- `avatarPreviewUrl` — отдельный `useState`, инициализируется из `getMediaUrl(defaultAvatar?.url)`
- `ResumePhotoUploader` вставляется в секцию «Личные данные» перед полями имени
- При завершении загрузки: `setValue('avatar', id)` + `setAvatarPreviewUrl(url)`
- При удалении: `setValue('avatar', null)` + `setAvatarPreviewUrl(null)`
- В `handleFormSubmit`: добавить `avatar: data.avatar` в payload

**`frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`**

- Добавить `defaultAvatar={r.avatar ?? null}` в `<ResumeForm>`

`CreateResumeClient.tsx` — изменений не требует (avatar `null` по умолчанию).

**`frontend/src/locales/ru/common.json`** + **`frontend/src/locales/en/common.json`**

В секцию `forms.resume`:

- `photoLabel`: «Фото» / «Photo»
- `photoUpload`: «Загрузить фото» / «Upload photo»
- `photoChange`: «Заменить» / «Change»
- `photoUploadError`: «Ошибка загрузки фото» / «Photo upload error»

`common.delete` уже существует.

## Тесты

**Новый `frontend/src/components/resume/ResumePhotoUploader.test.tsx`** — 6 тестов:

- Рендер без фото (placeholder + кнопка загрузки)
- Рендер с фото (img превью + кнопки замены и удаления)
- Успешная загрузка вызывает `onUploadComplete` с `{id, url}`
- Нажатие «Удалить» вызывает `onRemove`
- Ошибка загрузки отображает текст ошибки
- Кнопки недоступны когда `disabled=true`

**`frontend/src/components/resume/ResumeForm.test.tsx`** — добавить 4 теста:

- `ResumePhotoUploader` рендерится в форме
- `avatar` присутствует в данных сабмита после загрузки
- `avatar: null` в данных сабмита после удаления
- `defaultAvatar` корректно инициализирует превью и значение поля

## Что не меняется

- `ResumeStore.createResume` / `updateResume` — принимают `ResumeCreateInput`/`ResumeUpdateInput`, которые будут содержать `avatar`
- Публичное отображение аватара — `ResumeCard` и `ResumeDetailClient` уже показывают его через `getMediaUrl`

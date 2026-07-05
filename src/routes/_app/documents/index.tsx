import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { deleteDocument } from '@/api/delete-document'
import { downloadDocument } from '@/api/download-document'
import { getCases } from '@/api/get-cases'
import { getDocuments } from '@/api/get-documents'
import { uploadDocument } from '@/api/upload-document'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'
import { getErrorMessage } from '@/lib/get-error-message'

export const Route = createFileRoute('/_app/documents/')({
  component: DocumentsPage,
})

const categoryLabels: Record<DocumentCategory, string> = {
  PETITION: 'Petição',
  EVIDENCE: 'Prova',
  DISPATCH: 'Despacho',
  OTHER: 'Outros',
}

const uploadSchema = z.object({
  caseId: z.string().uuid('Selecione um caso.'),
  category: z.enum(['PETITION', 'EVIDENCE', 'DISPATCH', 'OTHER']),
  title: z.string().trim().min(1, 'Título é obrigatório.'),
  visibleToClient: z.enum(['true', 'false']),
  file: z
    .custom<File | null>((value) => value instanceof File, {
      message: 'Selecione um PDF.',
    })
    .refine(
      (value) =>
        !!value &&
        (value.type === 'application/pdf' || value.name.toLowerCase().endsWith('.pdf')),
      'Apenas arquivos PDF.'
    )
    .refine((value) => (value?.size ?? 0) <= 20 * 1024 * 1024, 'Limite de 20MB por arquivo.'),
})

type UploadFormData = z.infer<typeof uploadSchema>

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function DocumentsPage() {
  const queryClient = useQueryClient()
  const { userInfo } = useUser()
  const canUpload = userInfo?.role === 'ADMIN' || userInfo?.role === 'LAWYER'

  const {
    register,
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      caseId: '',
      category: 'OTHER',
      title: '',
      visibleToClient: 'false',
      file: null,
    },
  })

  const selectedCaseId = watch('caseId')

  const { data: casesData } = useQuery({
    queryKey: ['cases', 'documents', 1],
    queryFn: () => getCases(1),
  })

  const availableCases = casesData?.results ?? []
  const selectedCaseExists = availableCases.some((legalCase) => legalCase.id === selectedCaseId)

  const { data: documentsData, isLoading: loadingDocuments } = useQuery({
    queryKey: ['documents', selectedCaseId],
    queryFn: () => getDocuments(selectedCaseId),
    enabled: !!selectedCaseId,
  })

  const sortedDocuments = useMemo(
    () => (documentsData?.results ?? []).slice(),
    [documentsData?.results]
  )

  const { mutate: mutateUpload, isPending: uploading } = useMutation({
    mutationFn: (values: UploadFormData) =>
      uploadDocument({
        caseId: values.caseId,
        category: values.category,
        title: values.title,
        visibleToClient: values.visibleToClient === 'true',
        file: values.file as File,
      }),
    onSuccess: () => {
      toast.success('Documento anexado com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['documents', selectedCaseId] })
      reset({
        caseId: selectedCaseId,
        category: 'OTHER',
        title: '',
        visibleToClient: 'false',
        file: null,
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao anexar documento.'))
    },
  })

  const { mutate: mutateDelete, isPending: deleting } = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      toast.success('Documento removido com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['documents', selectedCaseId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao remover documento.'))
    },
  })

  const { mutate: mutateDownload, isPending: downloading } = useMutation({
    mutationFn: async (document: CaseDocument) => {
      const blob = await downloadDocument(document.id)
      const blobUrl = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = blobUrl
      link.download = document.original_filename
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao baixar documento.'))
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie anexos PDF dos casos com segurança e rastreabilidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar caso</CardTitle>
          <CardDescription>
            Escolha o caso para visualizar documentos vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            name="caseId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full max-w-2xl">
                  <SelectValue placeholder="Selecione um caso" />
                </SelectTrigger>
                <SelectContent>
                  {availableCases.map((legalCase) => (
                    <SelectItem key={legalCase.id} value={legalCase.id}>
                      {legalCase.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {!selectedCaseExists && selectedCaseId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Caso não encontrado na página atual de resultados.
            </p>
          )}
          {errors.caseId?.message && (
            <p className="mt-2 text-xs text-destructive">{errors.caseId.message}</p>
          )}
        </CardContent>
      </Card>

      {canUpload && selectedCaseId && (
        <Card>
          <CardHeader>
            <CardTitle>Anexar PDF</CardTitle>
            <CardDescription>
              Envie documentos em PDF com categoria e visibilidade para cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit((values) => mutateUpload(values))}>
              <div className="space-y-1.5 md:col-span-2">
                <p className="text-sm font-medium">Título</p>
                <Input {...register('title')} placeholder="Ex: Procuração assinada" />
                {errors.title?.message && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Categoria</p>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Visível para cliente</p>
                <Controller
                  name="visibleToClient"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <p className="text-sm font-medium">Arquivo PDF</p>
                <Controller
                  name="file"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="file"
                      accept="application/pdf,.pdf"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                    />
                  )}
                />
                {errors.file?.message && (
                  <p className="text-xs text-destructive">{String(errors.file.message)}</p>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={uploading}>
                  <Upload className="size-4" />
                  {uploading ? 'Enviando...' : 'Anexar documento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos anexados</CardTitle>
          <CardDescription>
            {selectedCaseId
              ? 'Lista de documentos vinculados ao caso selecionado.'
              : 'Selecione um caso para listar os documentos.'}
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!selectedCaseId ? (
            <p className="text-sm text-muted-foreground">Selecione um caso para começar.</p>
          ) : loadingDocuments ? (
            <p className="text-sm text-muted-foreground">Carregando documentos...</p>
          ) : sortedDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento encontrado para este caso.</p>
          ) : (
            <div className="space-y-2">
              {sortedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{document.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {categoryLabels[document.category]} · {formatBytes(document.size_bytes)} ·{' '}
                      {new Date(document.created_at).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <FileText className="size-3.5" /> {document.original_filename}
                    </p>
                    {document.uploaded_by_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enviado por: {document.uploaded_by_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => mutateDownload(document)}
                      disabled={downloading}
                    >
                      <Download className="size-3.5" />
                      Baixar
                    </Button>
                    {canUpload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => mutateDelete(document.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

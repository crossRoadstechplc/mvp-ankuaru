import {
  handleItemDelete,
  handleItemGet,
  handleItemPatch,
} from '@/lib/master-data/routes'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  return handleItemGet(request, context, 'farmers')
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  return handleItemPatch(request, context, 'farmers')
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  return handleItemDelete(request, context, 'farmers')
}

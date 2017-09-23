import * as path from 'path'
import * as ts from 'typescript'

import { render } from '../render'

import {
  IIdentifierMap,
  IRenderedFileMap,
  IRenderedFile,
  IResolvedFile,
  IResolvedIncludeMap,
} from '../types'

import {
  createImportsForIncludes,
  createThriftImports,
} from './utils'

/**
 * The generator is the primary interface for generating TypeScript code from
 * Thrift IDL. It takes a hash of options that inform it on how to resolve files
 * and where to save generated code.
 *
 * When a Thrift file includes another Thrift file the first place we search for
 * the include is local to the including file. If no matching file is found we
 * search relative to the sourceDir defined in the options.
 *
 * @param options
 */
export function generateFile(rootDir: string, outDir: string, sourceDir: string, files: Array<IResolvedFile>): Array<IRenderedFile> {
  function outPathForFile(resolvedFile: IResolvedFile): string {
    const filename: string = `${resolvedFile.name}.ts`
    const outFile: string = path.resolve(
      outDir,
      resolvedFile.namespace.path,
      filename,
    )

    return outFile
  }

  function createIncludes(currentPath: string, includes: IResolvedIncludeMap): IRenderedFileMap {
    return Object.keys(includes).reduce((acc: IRenderedFileMap, next: string): IRenderedFileMap => {
      const include: IResolvedFile = includes[next].file
      const renderedFile: IRenderedFile = createRenderedFile(include)
      acc[next] = renderedFile
      return acc
    }, {})
  }

  function createRenderedFile(resolvedFile: IResolvedFile): IRenderedFile {
    const includes: IRenderedFileMap = createIncludes(resolvedFile.path, resolvedFile.includes)
    const identifiers: IIdentifierMap = resolvedFile.identifiers
    const outPath: string = outPathForFile(resolvedFile)
    const statements: Array<ts.Statement> = [
      createThriftImports(),
      ...createImportsForIncludes(outPath, includes, resolvedFile.includes),
      ...render(resolvedFile.body, identifiers),
    ]

    return {
      name: resolvedFile.name,
      path: resolvedFile.path,
      outPath,
      namespace: resolvedFile.namespace,
      statements,
      includes,
      identifiers,
    }
  }

  return files.map((next: IResolvedFile): IRenderedFile => {
    return createRenderedFile(next)
  })
}
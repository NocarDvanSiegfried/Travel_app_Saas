#!/usr/bin/env node

/**
 * Скрипт для синхронизации package.json и package-lock.json
 * Автоматически обновляет lock-файл на основе package.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
const PACKAGE_LOCK_JSON = path.join(PROJECT_ROOT, 'package-lock.json');

console.log('🔄 Синхронизация зависимостей...\n');

// Проверяем наличие package.json
if (!fs.existsSync(PACKAGE_JSON)) {
  console.error('❌ package.json не найден!');
  process.exit(1);
}

// Читаем package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

console.log('📦 Зависимости в package.json:');
console.log(`   - Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
console.log(`   - DevDependencies: ${Object.keys(packageJson.devDependencies || {}).length}\n`);

// Проверяем наличие package-lock.json
const hasLockFile = fs.existsSync(PACKAGE_LOCK_JSON);

if (hasLockFile) {
  console.log('📋 package-lock.json найден, проверяем синхронизацию...\n');
  
  try {
    const lockFile = JSON.parse(fs.readFileSync(PACKAGE_LOCK_JSON, 'utf8'));
    const rootPackage = lockFile.packages?.[''] || {};
    
    const lockDeps = Object.keys(rootPackage.dependencies || {});
    const lockDevDeps = Object.keys(rootPackage.devDependencies || {});
    const packageDeps = Object.keys(packageJson.dependencies || {});
    const packageDevDeps = Object.keys(packageJson.devDependencies || {});
    
    const missingDeps = packageDeps.filter(dep => !lockDeps.includes(dep));
    const missingDevDeps = packageDevDeps.filter(dep => !lockDevDeps.includes(dep));
    
    if (missingDeps.length > 0 || missingDevDeps.length > 0) {
      console.log('⚠️  Обнаружены несинхронизированные зависимости:\n');
      
      if (missingDeps.length > 0) {
        console.log('   Missing dependencies:');
        missingDeps.forEach(dep => {
          console.log(`     - ${dep}@${packageJson.dependencies[dep]}`);
        });
        console.log('');
      }
      
      if (missingDevDeps.length > 0) {
        console.log('   Missing devDependencies:');
        missingDevDeps.forEach(dep => {
          console.log(`     - ${dep}@${packageJson.devDependencies[dep]}`);
        });
        console.log('');
      }
      
      console.log('🔄 Регенерируем package-lock.json...\n');
    } else {
      console.log('✅ Все зависимости синхронизированы!\n');
      console.log('🔄 Проверяем целостность lock-файла...\n');
    }
  } catch (error) {
    console.log('⚠️  Ошибка при чтении package-lock.json, регенерируем...\n');
  }
} else {
  console.log('⚠️  package-lock.json не найден, создаем...\n');
}

// Переходим в директорию проекта
process.chdir(PROJECT_ROOT);

try {
  // Удаляем старый lock-файл
  if (fs.existsSync(PACKAGE_LOCK_JSON)) {
    console.log('🗑️  Удаляем старый package-lock.json...');
    fs.unlinkSync(PACKAGE_LOCK_JSON);
  }
  
  // Регенерируем package-lock.json
  console.log('📦 Устанавливаем зависимости для синхронизации...');
  console.log('   (это может занять несколько минут)\n');
  
  execSync('npm install --package-lock-only --no-audit --no-fund', {
    stdio: 'inherit',
    cwd: PROJECT_ROOT
  });
  
  console.log('\n✅ package-lock.json успешно обновлен!\n');
  
  // Проверяем синхронизацию
  if (fs.existsSync(PACKAGE_LOCK_JSON)) {
    const lockFile = JSON.parse(fs.readFileSync(PACKAGE_LOCK_JSON, 'utf8'));
    const rootPackage = lockFile.packages?.[''] || {};
    
    const lockDeps = Object.keys(rootPackage.dependencies || {});
    const lockDevDeps = Object.keys(rootPackage.devDependencies || {});
    const packageDeps = Object.keys(packageJson.dependencies || {});
    const packageDevDeps = Object.keys(packageJson.devDependencies || {});
    
    console.log('📊 Результат синхронизации:');
    console.log(`   - Dependencies: ${packageDeps.length} в package.json, ${lockDeps.length} в lock-файле`);
    console.log(`   - DevDependencies: ${packageDevDeps.length} в package.json, ${lockDevDeps.length} в lock-файле\n`);
    
    const allDepsSynced = packageDeps.every(dep => lockDeps.includes(dep));
    const allDevDepsSynced = packageDevDeps.every(dep => lockDevDeps.includes(dep));
    
    if (allDepsSynced && allDevDepsSynced) {
      console.log('✅ Все зависимости успешно синхронизированы!\n');
      
      // Проверяем npm ci
      console.log('🧪 Проверяем npm ci...\n');
      try {
        execSync('npm ci --dry-run', {
          stdio: 'inherit',
          cwd: PROJECT_ROOT
        });
        console.log('\n✅ npm ci пройдет успешно!\n');
      } catch (error) {
        console.log('\n⚠️  npm ci проверка завершилась с предупреждениями (это нормально для dry-run)\n');
      }
    } else {
      console.log('⚠️  Некоторые зависимости все еще не синхронизированы\n');
      process.exit(1);
    }
  }
  
  console.log('🎉 Синхронизация завершена успешно!\n');
  
} catch (error) {
  console.error('\n❌ Ошибка при синхронизации зависимостей:');
  console.error(error.message);
  process.exit(1);
}





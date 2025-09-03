'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import styles from './Select.module.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
}

export default function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = "选择选项",
  label,
  className = "",
  disabled = false
}: SelectProps) {
  const selectedOption = options.find(option => option.value === value)

  return (
    <div className={className}>
      {label && (
        <label className={styles.label}>
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className={styles.container}>
          <Listbox.Button className={`${styles.button} ${disabled ? styles.disabled : ''}`}>
            <span className={styles.buttonText}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDownIcon
              className={styles.chevron}
              aria-hidden="true"
            />
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className={styles.options}>
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  className={({ active }) =>
                    `${styles.option} ${active ? styles.optionActive : ''}`
                  }
                  value={option.value}
                >
                  {({ selected }) => (
                    <>
                      <span className={`${styles.optionText} ${selected ? styles.optionSelected : ''}`}>
                        {option.label}
                      </span>
                      {selected ? (
                        <span className={styles.check}>
                          <CheckIcon className={styles.checkIcon} aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}